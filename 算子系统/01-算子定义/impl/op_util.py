
from abc import ABC, abstractmethod

try:
    import torch
except ImportError:  # pragma: no cover - optional runtime dependency
    torch = None

try:
    from datasets import Dataset
except ImportError:  # pragma: no cover - optional runtime dependency
    Dataset = None


class Operator_Base(ABC):

    def __init__(self, operator_name, accelerator="cuda", *args, **kwargs):

        self.operator_name = operator_name
        self.accelerator = accelerator

        self.text_key = "text"
        self.image_key = "image_path"
        self.video_key = "video_path"


    def use_npu(self):
        # Work in Progress
        return (
            self.accelerator == "cuda"
            and torch is not None
            and torch.cuda.is_available()
        )


    @abstractmethod
    def process(self) -> None:
        """
        Specific code for executing the operator should be written here.
        """
        pass


    @abstractmethod
    def run(self) -> None:
        """
        Call operator to modify the dataset.
        """
        pass

    

class Modifier(Operator_Base):

    def __init__(self, operator_name, accelerator="cuda", *args, **kwargs):

        super().__init__(operator_name, accelerator=accelerator, *args, **kwargs)

        self.output_folder = "./output/"


    @abstractmethod
    def process(self) -> None:
        """
        Specific code for executing the operator should be written here.
        """
        pass


    def run(self, dataset):

        return dataset.map(self.process)



class Filter(Operator_Base):
    def __init__(self, operator_name, accelerator="cuda", *args, **kwargs):

        super().__init__(operator_name, accelerator=accelerator, *args, **kwargs)


    @abstractmethod
    def process(self) -> None:
        """
        Specific code for executing the operator should be written here.
        """
        pass


    def run(self, dataset):

        return dataset.filter(self.process)
